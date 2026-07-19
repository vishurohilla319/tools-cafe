import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gemini-api-key, x-convert-api-secret',
}

serve(async (req) => {
  // Handle CORS preflight options request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const outputFormat = formData.get('output_format') as string || 'pdf';
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded in the request.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const inputName = file.name.toLowerCase();
    let inputFormat = 'docx';
    if (inputName.endsWith('.pdf')) inputFormat = 'pdf';
    else if (inputName.endsWith('.xlsx') || inputName.endsWith('.xls') || inputName.endsWith('.csv')) inputFormat = 'xlsx';
    else if (inputName.endsWith('.pptx') || inputName.endsWith('.ppt')) inputFormat = 'pptx';
    else if (inputName.endsWith('.docx') || inputName.endsWith('.doc')) inputFormat = 'docx';

    const convertApiSecret = req.headers.get('x-convert-api-secret') || Deno.env.get('CONVERT_API_SECRET');
    const geminiApiKey = req.headers.get('x-gemini-api-key') || Deno.env.get('GEMINI_API_KEY');

    let pdfResponse;

    if (inputFormat !== 'pdf' && outputFormat === 'pdf') {
      // Office to PDF conversion
      if (convertApiSecret) {
        // Use ConvertAPI
        const convertApiUrl = `https://v2.convertapi.com/convert/${inputFormat === 'xlsx' ? 'xlsx' : inputFormat === 'pptx' ? 'pptx' : 'docx'}/to/pdf?Secret=${convertApiSecret}`;
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

        const result = await apiResponse.json();
        const pdfUrl = result.Files[0].Url;
        pdfResponse = await fetch(pdfUrl);
      } else {
        // Fall back to Gotenberg's free public demo server
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
    } else if (inputFormat === 'pdf' && outputFormat !== 'pdf') {
      // PDF to Office conversion
      if (convertApiSecret) {
        // Use ConvertAPI
        const convertApiUrl = `https://v2.convertapi.com/convert/pdf/to/${outputFormat}?Secret=${convertApiSecret}`;
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

        const result = await apiResponse.json();
        const docUrl = result.Files[0].Url;
        pdfResponse = await fetch(docUrl);
      } else if (geminiApiKey) {
        // Use Gemini API free tier conversion
        const arrayBuffer = await file.arrayBuffer();
        const binary = new Uint8Array(arrayBuffer);
        
        // Convert to Base64 in chunks to prevent stack overflow on large files
        let binaryString = "";
        const chunkSize = 8192;
        for (let i = 0; i < binary.length; i += chunkSize) {
          const chunk = binary.subarray(i, i + chunkSize);
          binaryString += String.fromCharCode.apply(null, Array.from(chunk));
        }
        const base64Data = btoa(binaryString);

        let prompt = '';
        if (outputFormat === 'docx') {
          prompt = `Convert this PDF file to a high-fidelity HTML document that preserves the layout, styling, colors, tables, and spacing of the pages. Format it cleanly using inline CSS. Render pages inside '<div class="page" style="page-break-after: always; box-sizing: border-box; padding: 1in; background: white;">' elements. Return ONLY the HTML code starting with '<html>' and ending with '</html>'. Do not write any markdown formatting, markdown code blocks, or explanatory text.`;
        } else if (outputFormat === 'xlsx') {
          prompt = `Extract all data tables from this PDF. Organize the extracted rows and columns into a structured JSON array representing sheets and their grids.\nUse this JSON format:\n{\n  \"sheets\": [\n    {\n      \"name\": \"Sheet1\",\n      \"rows\": [\n        [\"Cell A1\", \"Cell B1\"],\n        [\"Cell A2\", \"Cell B2\"]\n      ]\n    }\n  ]\n}\nReturn ONLY the raw JSON block. Do not write any markdown code blocks, formatting, or introductory/explanatory text.`;
        } else if (outputFormat === 'pptx') {
          prompt = `Convert this PDF file into a clean PowerPoint layout structure represented in JSON. For each page in the PDF, define a slide title, a list of bullet points, and clean theme styling.\nUse this JSON format:\n{\n  \"slides\": [\n    {\n      \"title\": \"Slide Title\",\n      \"bullets\": [\"Bullet point 1\", \"Bullet point 2\"],\n      \"theme\": {\n        \"backgroundColor\": \"#ffffff\",\n        \"textColor\": \"#1e293b\",\n        \"accentColor\": \"#4f46e5\"\n      }\n    }\n  ]\n}\nReturn ONLY the raw JSON block. Do not write any markdown code blocks, formatting, or introductory/explanatory text.`;
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
        const payload = {
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: "application/pdf",
                    data: base64Data
                  }
                },
                {
                  text: prompt
                }
              ]
            }
          ]
        };

        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!geminiResponse.ok) {
          const errText = await geminiResponse.text();
          throw new Error(`Gemini API returned error: ${errText}`);
        }

        const geminiResult = await geminiResponse.json();
        let textOutput = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // Clean markdown code blocks
        textOutput = textOutput.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '').trim();

        if (outputFormat === 'docx') {
          return new Response(textOutput, {
            headers: { 
              ...corsHeaders,
              'Content-Type': 'text/html',
              'Content-Disposition': `attachment; filename="${file.name.replace(/\.[^/.]+$/, "")}.doc"`
            },
          });
        } else {
          return new Response(textOutput, {
            headers: { 
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          });
        }
      } else {
        throw new Error('Supabase Secret "CONVERT_API_SECRET" or "GEMINI_API_KEY" is not configured, and no client-side API key was provided.');
      }
    } else {
      throw new Error(`Unsupported conversion from ${inputFormat} to ${outputFormat}.`);
    }

    const outputBlob = await pdfResponse.blob();

    // Map MIME types
    let contentType = 'application/pdf';
    if (outputFormat === 'docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (outputFormat === 'xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (outputFormat === 'pptx') contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

    return new Response(outputBlob, {
      headers: { 
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${file.name.replace(/\.[^/.]+$/, "")}.${outputFormat}"`
      },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
