import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Card, CardContent } from '@/components/ui/card';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
}

export function QRScanner({ onScan }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5Qrcode("reader");

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    scannerRef.current
      .start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          onScan(decodedText);
          setError(null); // Clear error on successful scan
        },
        (error) => {
          console.error("QR Code scan error:", error);
          setError("Lỗi quét mã QR. Vui lòng kiểm tra camera và kết nối.");
        }
      )
      .catch((err) => {
          console.error("Error starting scanner:", err);
          const errorMessage = err?.message || String(err);
          if (errorMessage.includes("Requested device not found")) {
            setError("Không tìm thấy thiết bị camera. Vui lòng kiểm tra quyền truy cập camera của trình duyệt.");
          } else {
            setError("Lỗi khởi chạy máy quét mã QR. Vui lòng thử lại.");
          }
        });

    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch((err) => console.error("Error stopping scanner:", err));
      }
    };
  }, [onScan]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-4">
        <div id="reader" className="w-full aspect-square" />
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </CardContent>
    </Card>
  );
}