import { openai } from "@/lib/server/openai";

// download file by file ID
export async function GET(_request: Request, context: { params: { fileId: string } }) {
  const { fileId } = context.params;
  const [file, fileContent] = await Promise.all([
    openai.files.retrieve(fileId),
    openai.files.content(fileId),
  ]);
  return new Response(fileContent.body, {
    headers: {
      "Content-Disposition": `attachment; filename="${file.filename}"`,
    },
  });
}
