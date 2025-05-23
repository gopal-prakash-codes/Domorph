import path from "path";
import fs from "fs/promises";
import archiver from "archiver";


export const downloadZip = async (req, res) => {
  const { domain } = req.query;

  if (!domain) {
    return res.status(400).send("Missing domain query parameter.");
  }
  const folderPath = path.join(
    process.cwd(),
    "..",
    "client",
    "public",         
    "scraped_website",
    domain
  );
  console.log(folderPath)

    try {
    await fs.access(folderPath);
  } catch {
    return res.status(404).send("Folder not found.");
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${domain}.zip"`);

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", err => {
    console.error("Archiving failed:", err);
    res.status(500).send("Zip generation failed");
  });

  archive.pipe(res);
  archive.directory(folderPath, false);
  archive.finalize().catch(err => {
    console.error("Finalization error:", err);
  });
};
