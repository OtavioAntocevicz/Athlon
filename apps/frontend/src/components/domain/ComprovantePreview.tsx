function isPdfUrl(url: string): boolean {
  return /\.pdf($|\?)/i.test(url) || url.toLowerCase().includes("application/pdf");
}

export function ComprovantePreview({ url }: { url: string }) {
  if (isPdfUrl(url)) {
    return (
      <iframe
        src={url}
        title="Comprovante PDF"
        className="h-80 w-full rounded-lg border bg-white"
      />
    );
  }

  return (
    <img
      src={url}
      alt="Comprovante"
      className="max-h-80 w-full rounded-lg border object-contain"
    />
  );
}
