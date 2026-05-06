import { toast } from "@/hooks/use-toast";

interface ShareData {
  title: string;
  text: string;
  url: string;
}

export const handleShare = async (data: ShareData) => {
  const shareUrl = new URL(data.url, window.location.origin);
  
  const finalShareData = {
    title: data.title,
    text: data.text,
    url: shareUrl.toString(),
  };

  try {
    if (navigator.share) {
      await navigator.share(finalShareData);
      toast({ title: 'Shared!', description: 'Link shared successfully.' });
    } else {
      await navigator.clipboard.writeText(shareUrl.toString());
      toast({ title: 'Link Copied', description: 'Link copied to clipboard.' });
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Error sharing:', error);
    }
  }
};
