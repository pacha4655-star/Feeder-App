// Download and Poster Generation Utilities for Feeder

export async function downloadMediaFile(url: string, filename: string = 'feeder-media.jpg'): Promise<void> {
  try {
    // If it's a data URL, directly download via link
    if (url.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Try fetching as blob (handles cross-origin images when possible)
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
  } catch (err) {
    console.warn('Direct blob download failed, falling back to canvas/new tab:', err);
    // Fallback: draw onto canvas
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(blob => {
            if (blob) {
              const canvasBlobUrl = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = canvasBlobUrl;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              setTimeout(() => URL.revokeObjectURL(canvasBlobUrl), 1500);
            }
          }, 'image/jpeg', 0.95);
        }
      };
      img.src = url;
    } catch (canvasErr) {
      // Last resort fallback
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

export interface PosterData {
  type: 'rescue' | 'adoption' | 'lost_pet' | 'feeding_drive' | 'post';
  title: string;
  subtitle?: string;
  animalName?: string;
  speciesOrBreed?: string;
  location: string;
  description: string;
  imageUrl?: string;
  urgency?: string;
  contactPhone?: string;
  contactName?: string;
  date?: string;
}

export async function generateAndDownloadPoster(data: PosterData): Promise<void> {
  const canvas = document.createElement('canvas');
  // High resolution standard printable A4/poster proportion (1200 x 1600 px)
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 1200, 1600);

  // Outer Border & Clean Framing
  ctx.strokeStyle = '#2E7D32';
  ctx.lineWidth = 16;
  ctx.strokeRect(20, 20, 1160, 1560);

  // Top Banner
  const isEmergency = data.type === 'rescue' || data.type === 'lost_pet';
  ctx.fillStyle = isEmergency ? '#D32F2F' : '#2E7D32';
  ctx.fillRect(28, 28, 1144, 160);

  // Top Banner Typography
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 52px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  const bannerText = isEmergency
    ? '🚨 EMERGENCY RESCUE / LOST ANIMAL'
    : '🐾 FEEDER COMMUNITY ANIMAL CARE';
  ctx.fillText(bannerText, 600, 100);

  ctx.font = '600 28px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText(data.title.toUpperCase(), 600, 150);

  // Image section
  const drawPosterImage = (loadedImg?: HTMLImageElement) => {
    const imgX = 80;
    const imgY = 220;
    const imgW = 1040;
    const imgH = 640;

    // Image frame background
    ctx.fillStyle = '#F1F5F2';
    ctx.fillRect(imgX, imgY, imgW, imgH);
    ctx.strokeStyle = '#E0E6E2';
    ctx.lineWidth = 4;
    ctx.strokeRect(imgX, imgY, imgW, imgH);

    if (loadedImg) {
      // Draw image keeping aspect ratio cover
      const hRatio = imgW / loadedImg.width;
      const vRatio = imgH / loadedImg.height;
      const ratio = Math.max(hRatio, vRatio);
      const centerShiftX = (imgW - loadedImg.width * ratio) / 2;
      const centerShiftY = (imgH - loadedImg.height * ratio) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(imgX, imgY, imgW, imgH);
      ctx.clip();
      ctx.drawImage(
        loadedImg,
        0, 0, loadedImg.width, loadedImg.height,
        imgX + centerShiftX, imgY + centerShiftY, loadedImg.width * ratio, loadedImg.height * ratio
      );
      ctx.restore();
    } else {
      ctx.fillStyle = '#4B6354';
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🐾 Animal Community Care', 600, 540);
    }

    // Animal Name / Header Below Image
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1A2E1E';
    ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
    const mainHeadline = data.animalName ? `Animal: ${data.animalName}` : data.title;
    ctx.fillText(mainHeadline.slice(0, 36), 80, 940);

    // Location Chip
    ctx.fillStyle = '#E8F5E9';
    ctx.fillRect(80, 970, 600, 60);
    ctx.strokeStyle = '#2E7D32';
    ctx.lineWidth = 2;
    ctx.strokeRect(80, 970, 600, 60);

    ctx.fillStyle = '#1B5E20';
    ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
    ctx.fillText(`📍 Location: ${data.location}`, 100, 1012);

    // Description text (wrapped)
    ctx.fillStyle = '#37474F';
    ctx.font = '500 28px system-ui, -apple-system, sans-serif';
    const words = (data.description || 'Community feeder & rescue alert. Please contact immediately if seen.').split(' ');
    let line = '';
    let currY = 1080;
    for (let n = 0; n < words.length && currY <= 1260; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 1040 && n > 0) {
        ctx.fillText(line, 80, currY);
        line = words[n] + ' ';
        currY += 44;
      } else {
        line = testLine;
      }
    }
    if (line && currY <= 1260) {
      ctx.fillText(line, 80, currY);
    }

    // Contact Box (Highlight box at bottom)
    ctx.fillStyle = isEmergency ? '#FFEBEE' : '#E8F5E9';
    ctx.fillRect(80, 1310, 1040, 170);
    ctx.strokeStyle = isEmergency ? '#C62828' : '#2E7D32';
    ctx.lineWidth = 4;
    ctx.strokeRect(80, 1310, 1040, 170);

    ctx.fillStyle = isEmergency ? '#B71C1C' : '#1B5E20';
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.fillText(`📞 CONTACT RESCUER / FEEDER:`, 110, 1365);

    ctx.fillStyle = '#1A2E1E';
    ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
    const phone = data.contactPhone || '+91 98401 23456';
    const name = data.contactName ? ` (${data.contactName})` : '';
    ctx.fillText(`${phone}${name}`, 110, 1435);

    // Footer Branding
    ctx.fillStyle = '#78909C';
    ctx.font = '600 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      'Created with Feeder • The Community Platform for Animal Feeders & Rescuers',
      600,
      1540
    );

    // Trigger instant download
    canvas.toBlob(blob => {
      if (blob) {
        const posterUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = posterUrl;
        const safeName = (data.animalName || data.title || 'animal-poster').toLowerCase().replace(/[^a-z0-9]/g, '-');
        link.download = `feeder-poster-${safeName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(posterUrl), 2000);
      }
    }, 'image/png');
  };

  if (data.imageUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => drawPosterImage(img);
    img.onerror = () => drawPosterImage();
    img.src = data.imageUrl;
  } else {
    drawPosterImage();
  }
}
