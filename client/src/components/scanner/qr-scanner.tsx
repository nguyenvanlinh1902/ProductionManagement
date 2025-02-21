import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
}

export function QRScanner({ onScan }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

  const startScanner = async () => {
    if (!containerRef.current) return;

    try {
      // Request camera permission explicitly
      await navigator.mediaDevices.getUserMedia({ video: true });

      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        // Always try to use the back camera on mobile
        const containerId = 'qr-reader';
        const container = document.createElement('div');
        container.id = containerId;
        containerRef.current.innerHTML = ''; // Clear previous instance
        containerRef.current.appendChild(container);

        scannerRef.current = new Html5Qrcode(containerId);

        await scannerRef.current.start(
          { facingMode: 'environment' }, // Prefer back camera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1
          },
          (decodedText) => {
            if (typeof onScan === 'function') {
              onScan(decodedText);
              // Thông báo khi quét thành công
              toast({
                title: "Thành công",
                description: "Đã quét mã QR thành công"
              });
            }
          },
          (errorMessage) => {
            // Ignore non-critical warnings
            if (!errorMessage.includes('QR code not found')) {
              console.warn(`QR Error: ${errorMessage}`);
            }
          }
        );

        setIsScanning(true);
        setError(null);
      } else {
        setError("Không tìm thấy camera trên thiết bị của bạn");
      }
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      setError(err.message === 'Permission denied'
        ? "Vui lòng cấp quyền truy cập camera để quét mã QR"
        : "Không thể kết nối với camera. Vui lòng kiểm tra quyền truy cập camera của trình duyệt.");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {error && (
            <div className="text-red-500 text-sm p-4 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div ref={containerRef} className="w-full aspect-square relative bg-muted rounded-lg">
            {!isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button 
                  onClick={startScanner}
                  className="flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Bật camera
                </Button>
              </div>
            )}
          </div>

          {isScanning && (
            <Button 
              onClick={stopScanner}
              variant="outline"
              className="w-full flex items-center gap-2"
            >
              <CameraOff className="w-4 h-4" />
              Tắt camera
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}