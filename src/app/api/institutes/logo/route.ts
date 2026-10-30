import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin credentials not configured');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
];

const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB

// POST: Upload or Replace Institute Logo
export async function POST(request: Request) {
  try {
    const adminClient = getAdminClient();

    let instituteId = '';
    let fileBuffer: Buffer | null = null;
    let fileName = '';
    let mimeType = '';

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      instituteId = (formData.get('institute_id') as string) || '';

      if (!file) {
        return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
      }

      fileName = file.name;
      mimeType = file.type;

      // 1. Validate File Size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: 'File size exceeds maximum limit of 3MB' },
          { status: 400 }
        );
      }

      // 2. Validate MIME Type
      if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
        return NextResponse.json(
          {
            error:
              'Unsupported file format. Please upload a PNG, JPG, JPEG, WebP, or clean SVG image.',
          },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      // JSON payload fallback with base64 Data URI
      const body = await request.json();
      instituteId = body.institute_id || '';
      const dataUri = body.image_data || body.logo_url || '';

      if (!dataUri || !dataUri.includes('base64,')) {
        return NextResponse.json(
          { error: 'Invalid image data. Provide a valid file or base64 Data URI.' },
          { status: 400 }
        );
      }

      const parts = dataUri.split(';base64,');
      mimeType = parts[0].replace('data:', '');
      const rawBase64 = parts[1];

      if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
        return NextResponse.json(
          { error: 'Unsupported file format in base64 data.' },
          { status: 400 }
        );
      }

      fileBuffer = Buffer.from(rawBase64, 'base64');
      if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: 'File size exceeds maximum limit of 3MB' },
          { status: 400 }
        );
      }

      fileName = `logo.${mimeType.split('/')[1] || 'png'}`;
    }

    if (!instituteId) {
      return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
    }

    // 3. SVG Safety Check: Verify no malicious scripts
    if (mimeType === 'image/svg+xml' && fileBuffer) {
      const svgText = fileBuffer.toString('utf-8');
      if (
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(svgText) ||
        /javascript:/gi.test(svgText) ||
        /onload=/gi.test(svgText) ||
        /onerror=/gi.test(svgText)
      ) {
        return NextResponse.json(
          { error: 'Invalid SVG file: Security policy rejects scripts in SVG assets.' },
          { status: 400 }
        );
      }
    }

    // 4. Upload to Supabase Storage Bucket ('institute-logos')
    let finalLogoUrl = '';
    const fileExt = fileName.split('.').pop()?.toLowerCase() || 'png';
    const storagePath = `${instituteId}/logo-${Date.now()}.${fileExt}`;

    try {
      // Attempt bucket creation if not exists
      try {
        await adminClient.storage.createBucket('institute-logos', { public: true });
      } catch {}

      if (fileBuffer) {
        const { error: uploadError } = await adminClient.storage
          .from('institute-logos')
          .upload(storagePath, fileBuffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (!uploadError) {
          const { data: pubData } = adminClient.storage
            .from('institute-logos')
            .getPublicUrl(storagePath);
          if (pubData?.publicUrl) {
            finalLogoUrl = pubData.publicUrl;
          }
        } else {
          console.warn('[API /api/institutes/logo] Storage upload error:', uploadError);
        }
      }
    } catch (storageErr) {
      console.warn('[API /api/institutes/logo] Storage bucket error:', storageErr);
    }

    // 5. Fallback: If Supabase Storage is not connected or network is offline, use base64 Data URI
    if (!finalLogoUrl && fileBuffer) {
      finalLogoUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
    }

    if (!finalLogoUrl) {
      return NextResponse.json({ error: 'Failed to process logo image' }, { status: 500 });
    }

    // 6. Update institute record in database
    const { data: updatedInst, error: dbError } = await adminClient
      .from('institutes')
      .update({
        logo_url: finalLogoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', instituteId)
      .select()
      .single();

    if (dbError) {
      console.error('[API /api/institutes/logo] DB Update error:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    // 7. Log audit event
    try {
      await adminClient.from('audit_logs').insert([
        {
          institute_id: instituteId,
          action: 'logo_updated',
          category: 'institute',
          description: `Institute branding logo was updated for "${updatedInst.name}"`,
          metadata: { institute_id: instituteId, file_name: fileName },
        },
      ]);
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Institute logo uploaded successfully',
      logo_url: finalLogoUrl,
      institute: updatedInst,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to upload institute logo' },
      { status: 500 }
    );
  }
}

// DELETE: Remove Institute Logo
export async function DELETE(request: Request) {
  try {
    const adminClient = getAdminClient();
    const { searchParams } = new URL(request.url);
    let instituteId = searchParams.get('institute_id');

    if (!instituteId) {
      try {
        const body = await request.json();
        instituteId = body.institute_id;
      } catch {}
    }

    if (!instituteId) {
      return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 });
    }

    // 1. Update database record: set logo_url to null
    const { data: updatedInst, error: dbError } = await adminClient
      .from('institutes')
      .update({
        logo_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', instituteId)
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    // 2. Log audit event
    try {
      await adminClient.from('audit_logs').insert([
        {
          institute_id: instituteId,
          action: 'logo_removed',
          category: 'institute',
          description: `Institute logo was removed for "${updatedInst?.name || instituteId}"`,
          metadata: { institute_id: instituteId },
        },
      ]);
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Institute logo removed successfully. Default logo will now be displayed.',
      institute: updatedInst,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to remove institute logo' },
      { status: 500 }
    );
  }
}
