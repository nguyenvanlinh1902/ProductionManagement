
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Card, CardContent } from '@/components/ui/card';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
}

export function QRScanner({ onScan }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const containerId = 'qr-reader';
    const container = document.createElement('div');
    container.id = containerId;
    containerRef.current.appendChild(container);

    scannerRef.current = new Html5Qrcode(containerId);

    scannerRef.current
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          if (typeof onScan === 'function') {
            onScan(decodedText);
          }
        },
        (errorMessage) => {
          // Ignore non-critical warnings
          if (!errorMessage.includes('QR code not found')) {
            console.warn(`QR Error: ${errorMessage}`);
          }
        },
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
      if (scannerRef.current?.isScanning) {
        scannerRef.current
          .stop()
          .catch((err) => console.error("Error stopping scanner:", err));
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [onScan]);

  return (
    <Card>
      <CardContent className="p-6">
        <div ref={containerRef} className="w-full">
          {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
