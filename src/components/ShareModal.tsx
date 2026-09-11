import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  Download,
  MessageCircle,
  QrCode,
  ExternalLink,
  Heart,
  FileText
} from 'lucide-react';
import { generateAndDownloadPoster, downloadMediaFile } from '../utils/downloadHelper';

export interface ShareData {
  title: string;
  text?: string;
  url?: string;
  imageUrl?: string;
  animalName?: string;
  location?: string;
  category?: string;
  contactPhone?: string;
  contactName?: string;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ShareData;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, data }) => {
  const [copied, setCopied] = useState(false);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [showQR, setShowQR] = useState(false);

  if (!isOpen) return null;

  const shareUrl = data.url || window.location.href;
  const shareTitle = data.title || 'Check out this pet update on Feeder';
  const shareText = data.text ? `${data.text}\n\n${shareUrl}` : `${shareTitle}\n${shareUrl}`;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: data.text || shareTitle,
          url: shareUrl
        });
      } catch (e) {
        console.log('Share dismissed or failed', e);
      }
    } else {
      handleCopy();
    }
  };

  const handleWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleTwitter = () => {
    const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twUrl, '_blank', 'noopener,noreferrer');
  };

  const handleFacebook = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(fbUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadImage = async () => {
    if (data.imageUrl) {
      await downloadMediaFile(data.imageUrl, `feeder-image-${Date.now()}.jpg`);
    }
  };

  const handleDownloadPoster = async () => {
    setIsGeneratingPoster(true);
    try {
      await generateAndDownloadPoster({
        type: data.category === 'help' || data.category === 'lost_pet' ? 'rescue' : 'adoption',
        title: data.title,
        animalName: data.animalName,
        location: data.location || 'Local Neighborhood',
        description: data.text || 'Feeder community update and rescue alert.',
        imageUrl: data.imageUrl,
        contactPhone: data.contactPhone || '+91 98401 23456',
        contactName: data.contactName
      });
    } catch (err) {
      console.error('Poster generation failed', err);
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Share to Community</h3>
              <p className="text-[11px] text-slate-500">Spread the word to save paws & wings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Card Preview */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
          {data.imageUrl ? (
            <img
              src={data.imageUrl}
              alt="Preview"
              className="w-16 h-16 rounded-2xl object-cover border border-slate-200 flex-shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center text-2xl flex-shrink-0">
              🐾
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{data.title}</h4>
            {data.location && (
              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                📍 {data.location}
              </p>
            )}
            {data.text && (
              <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 italic">
                "{data.text}"
              </p>
            )}
          </div>
        </div>

        {/* Action Grid */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Quick Share Apps */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Share Via
            </div>
            <div className="grid grid-cols-4 gap-2">
              {/* WhatsApp */}
              <button
                onClick={handleWhatsApp}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl hover:bg-green-50/70 border border-slate-100 hover:border-green-200 transition-all group"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <MessageCircle className="w-5 h-5 fill-white" />
                </div>
                <span className="text-[10px] font-semibold text-slate-700">WhatsApp</span>
              </button>

              {/* Twitter/X */}
              <button
                onClick={handleTwitter}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl hover:bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all group"
              >
                <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform font-bold text-xs">
                  𝕏
                </div>
                <span className="text-[10px] font-semibold text-slate-700">X / Post</span>
              </button>

              {/* Facebook */}
              <button
                onClick={handleFacebook}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl hover:bg-blue-50/70 border border-slate-100 hover:border-blue-200 transition-all group"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform font-bold text-sm">
                  f
                </div>
                <span className="text-[10px] font-semibold text-slate-700">Facebook</span>
              </button>

              {/* System Share (Native) */}
              <button
                onClick={handleNativeShare}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl hover:bg-green-50/70 border border-slate-100 hover:border-green-200 transition-all group"
              >
                <div className="w-10 h-10 rounded-2xl bg-green-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Share2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold text-slate-700">More</span>
              </button>
            </div>
          </div>

          {/* Download Options (User Request: download posters/images directly) */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Downloads & Printable Posters
            </div>
            <div className="space-y-2">
              <button
                onClick={handleDownloadPoster}
                disabled={isGeneratingPoster}
                id="download-printable-poster-btn"
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-green-700 to-green-600 text-white font-semibold text-xs shadow-md shadow-green-700/20 hover:from-green-800 hover:to-green-700 active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
                    <Download className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-xs leading-none">Download High-Res Poster</p>
                    <p className="text-[10px] text-green-100 mt-0.5 leading-none">
                      Printable A4 format with photo, details & contact info
                    </p>
                  </div>
                </div>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md font-bold">
                  {isGeneratingPoster ? 'Generating...' : 'PNG'}
                </span>
              </button>

              {data.imageUrl && (
                <button
                  onClick={handleDownloadImage}
                  id="download-media-file-btn"
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-xs text-slate-800 leading-none">Download Original Photo</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-none">Save raw media to your gallery</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Original</span>
                </button>
              )}
            </div>
          </div>

          {/* Copy Link Row */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Shareable Link
            </div>
            <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-transparent px-2 text-xs text-slate-700 font-mono focus:outline-none select-all"
              />
              <button
                onClick={handleCopy}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  copied
                    ? 'bg-green-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-800 shadow-xs border border-slate-200'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* QR Code toggle */}
          <div className="pt-1">
            <button
              onClick={() => setShowQR(!showQR)}
              className="text-xs text-green-700 hover:text-green-800 font-semibold flex items-center gap-1.5 mx-auto"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{showQR ? 'Hide QR Code' : 'Show In-Person Scan QR Code'}</span>
            </button>

            {showQR && (
              <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center text-center animate-in zoom-in-95 duration-150">
                <div className="p-3 bg-white rounded-2xl shadow-xs border border-slate-200 mb-2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareUrl)}`}
                    alt="QR Code"
                    className="w-32 h-32"
                  />
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Scan with any phone camera to view this post instantly
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
