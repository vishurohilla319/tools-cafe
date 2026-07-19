import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight options request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded in the request.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Read ConvertAPI Secret Key from Deno environment variable
    const convertApiSecret = Deno.env.get('CONVERT_API_SECRET');
    
    let pdfResponse;
    if (convertApiSecret) {
      // Send the DOCX file to ConvertAPI to compile a native vector PDF
      const convertApiUrl = `https://v2.convertapi.com/convert/docx/to/pdf?Secret=${convertApiSecret}`;
      const apiFormData = new FormData();
      apiFormData.append('File', file);

      const apiResponse = await fetch(convertApiUrl, {
        method: 'POST',
        body: apiFormData,
      });

      if (!apiResponse.ok) {
        const errText = await apiResponse.text();
        throw new Error(`ConvertAPI returned error: ${errText}`);
      }

      // ConvertAPI returns list of converted files with download URLs
      const result = await apiResponse.json();
      const pdfUrl = result.Files[0].Url;
      
      // Download the compiled native PDF file
      pdfResponse = await fetch(pdfUrl);
    } else {
      // Fall back to Gotenberg's free public demo server (LibreOffice high-fidelity conversion)
      const gotenbergUrl = `https://demo.gotenberg.dev/forms/libreoffice/convert`;
      const apiFormData = new FormData();
      apiFormData.append('files', file);

      pdfResponse = await fetch(gotenbergUrl, {
        method: 'POST',
        body: apiFormData,
      });

      if (!pdfResponse.ok) {
        const errText = await pdfResponse.text();
        throw new Error(`Gotenberg conversion failed: ${errText}`);
      }
    }

    const pdfBlob = await pdfResponse.blob();

    return new Response(pdfBlob, {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.name.replace(/\.[^/.]+$/, "")}.pdf"`
      },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
