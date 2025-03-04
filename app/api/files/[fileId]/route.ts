import { openai } from "@/lib/server/openai";

// download file by file ID
export async function GET(_request: Request, context: { params: { fileId: string } }) {
  const { fileId } = context.params;
  try {
    const [file, fileContent] = await Promise.all([
      openai.files.retrieve(fileId),
      openai.files.content(fileId),
    ]);
    return new Response(fileContent.body, {
      headers: {
        "Content-Disposition": `attachment; filename="${file.filename}"`,
      },
    });
  } catch (error) {
    console.error("Error retrieving file:", error);
    return new Response(
      JSON.stringify({ error: "Failed to retrieve file" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
