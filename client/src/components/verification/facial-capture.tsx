import { useState, useRef } from 'react';
import { Camera, Upload, X, Check, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FacialCaptureProps {
  onCapture: (file: File) => void;
  onRemove?: () => void;
  existingImage?: string;
  title?: string;
  description?: string;
}

export function FacialCapture({ 
  onCapture, 
  onRemove, 
  existingImage,
  title = "Facial Verification",
  description = "Take a clear selfie for identity verification. Ensure good lighting and face the camera directly."
}: FacialCaptureProps) {
  const [preview, setPreview] = useState<string | null>(existingImage || null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, or WebP)');
      return false;
    }

    // Check file size (max 5MB)
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {preview ? (
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden border-2 border-green-200 bg-green-50">
              <img 
                src={preview} 
                alt="Facial Verification Preview" 
                className="w-full h-auto max-h-64 object-contain"
              />
              <div className="absolute top-2 right-2 bg-green-500 text-white p-2 rounded-full">
                <Check className="h-4 w-4" />
              </div>
            </div>
            <Button 
              type="button"
              variant="outline" 
              onClick={handleRemove}
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Remove and Take New Photo
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              type="button"
              variant="default"
              onClick={() => cameraInputRef.current?.click()}
              className="w-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Selfie
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose from Gallery
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
              capture="user"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>✓ Face the camera directly</p>
          <p>✓ Ensure good lighting</p>
          <p>✓ Remove glasses and hats</p>
          <p>✓ Keep a neutral expression</p>
          <p>✓ Maximum file size: 5MB</p>
        </div>
      </CardContent>
    </Card>
  );
}
