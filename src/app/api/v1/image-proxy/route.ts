import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url");
    const driveId = searchParams.get("id");

    let fetchUrl = targetUrl;

    if (driveId) {
      fetchUrl = `https://drive.google.com/thumbnail?id=${driveId}&sz=w1200`;
    } else if (targetUrl) {
      const trimmed = targetUrl.trim();
      const match =
        trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
        trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);

      if (
        (trimmed.includes("drive.google.com") || trimmed.includes("docs.google.com")) &&
        match &&
        match[1]
      ) {
        fetchUrl = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1200`;
      }
    }

    if (!fetchUrl) {
      return new NextResponse("Missing url parameter", { status: 400 });
    }

    // Fetch from target with standard headers to bypass Google Drive bot checks
    const response = await fetch(fetchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      // Fallback to export=view endpoint if thumbnail endpoint fails
      if (driveId || fetchUrl.includes("drive.google.com")) {
        const id = driveId || fetchUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];
        if (id) {
          const fallbackRes = await fetch(
            `https://drive.google.com/uc?export=view&id=${id}`,
            {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              },
            }
          );
          if (fallbackRes.ok) {
            const buffer = await fallbackRes.arrayBuffer();
            const contentType = fallbackRes.headers.get("content-type") || "image/jpeg";
            return new NextResponse(buffer, {
              headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }
        }
      }

      return new NextResponse(`Failed to fetch image: ${response.statusText}`, {
        status: response.status,
      });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    return new NextResponse(`Image proxy error: ${err.message}`, { status: 500 });
  }
}
