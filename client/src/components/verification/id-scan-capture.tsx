import { useState, useRef } from 'react';
import { Camera, Upload, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface IdScanCaptureProps {
  onCapture: (file: File) => void;
  onRemove?: () => void;
  existingImage?: string;
  title?: string;
  description?: string;
  side?: 'front' | 'back';
}

export function IdScanCapture({ 
  onCapture, 
  onRemove, 
  existingImage,
  title = "ID Document Scan",
  description = "Upload a clear photo of your government-issued ID",
  side = 'front'
}: IdScanCaptureProps) {
  const [preview, setPreview] = useState<string | null>(existingImage || null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, or WebP)');
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return false;
    }

    setError('');
    return true;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateFile(file)) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    onCapture(file);
  };

  const handleRemove = () => {
    setPreview(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    onRemove?.();
  };

  return (
    <Card className={side === 'back' ? 'border-dashed' : ''}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4" />
          {title} {side === 'back' ? '(Back Side)' : '(Front Side)'}
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {preview ? (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden border-2 border-green-200 bg-green-50">
              <img 
                src={preview} 
                alt="ID Document Preview" 
                className="w-full h-auto max-h-48 object-contain"
              />
              <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                <Check className="h-3 w-3" />
              </div>
            </div>
            <Button 
              type="button"
              variant="outline" 
              size="sm"
              onClick={handleRemove}
              className="w-full text-xs h-8"
            >
              <X className="h-3 w-3 mr-1" />
              Remove
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-xs h-9"
            >
              <Upload className="h-3 w-3 mr-1" />
              Gallery
            </Button>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => cameraInputRef.current?.click()}
              className="w-full text-xs h-9"
            >
              <Camera className="h-3 w-3 mr-1" />
              Camera
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
