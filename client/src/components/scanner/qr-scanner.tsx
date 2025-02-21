import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Card, CardContent } from '@/components/ui/card';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
}

export function QRScanner({ onScan }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);

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
        },
        (error) => {
          console.error(error);
        }
      )
      .catch((err) => {
        console.error("Error starting scanner:", err);
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
      </CardContent>
    </Card>
  );
}