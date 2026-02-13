"use client";

import React, { useState, useEffect, useRef, ChangeEvent } from "react";
import {
  X,
  Upload,
  Check,
  Image as ImageIcon,
  Maximize2,
  AlertTriangle,
} from "lucide-react";
import {
  GRID_SIZE,
  PRICE_PER_PIXEL,
  OVERRIDE_PRICE_PER_PIXEL,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_IMAGE_LABEL,
  SCALE_OPTIONS,
} from "@/lib/constants";
import ReactCrop, {
  Crop,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
// @ts-ignore
import * as nsfwjs from "nsfwjs";
import { QRCodeSVG } from "qrcode.react";

interface PaymentData {
  project: string;
  order_id: string;
  amount: number;
  fee: number;
  total_payment: number;
  payment_method: string;
  payment_number: string;
  expired_at: string;
}

// Helper function to center the crop initially
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (memeData: any) => void;
  initialPosition?: { x: number; y: number };
  existingMemes?: any[];
}

const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  initialPosition,
  existingMemes = [],
}) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);

  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  const [title, setTitle] = useState(""); // auto-set from filename
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync position
  useEffect(() => {
    if (isOpen && initialPosition) {
      setPosition(initialPosition);
      // Reset logic
      setImageFile(null);
      setImgSrc("");
      setTitle("");
      setError(null);
      setCrop(undefined);
      setCompletedCrop(undefined);
      setScale(1);
    }
  }, [isOpen, initialPosition]);

  const onSelectFile = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined); // Makes crop preview update between images
      const file = e.target.files[0];
      setImageFile(file);
      setTitle(file.name.split(".")[0]);

      const reader = new FileReader();
      reader.addEventListener("load", () =>
        setImgSrc(reader.result?.toString() || ""),
      );
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = async (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const { width, height } = img;
    // Default to a 100x100 crop or centered full aspect
    // For freeform, just center a reasonable box
    setCrop(centerAspectCrop(width, height, 1));

    // NSFW Scanning
    setIsScanning(true);
    setError(null);
    try {
      const model = await nsfwjs.load();
      const predictions = await model.classify(img);
      console.log("NSFW Predictions:", predictions);

      const unsafe = predictions.find(
        (p: any) =>
          (p.className === "Porn" || p.className === "Hentai") &&
          p.probability > 0.6,
      );

      if (unsafe) {
        setError(
          `Gambar mengandung konten sensitif (${unsafe.className}). Upload dibatalkan.`,
        );
        setImgSrc("");
        setImageFile(null);
        setCrop(undefined);
        setCompletedCrop(undefined);
        setScale(1);
      }
    } catch (err) {
      console.error("NSFW Scan Error:", err);
      // Optional: block if scan fails, or warn
    } finally {
      setIsScanning(false);
    }
  };

  // Helper to generate blob from canvas
  const getCroppedImg = async (
    image: HTMLImageElement,
    crop: PixelCrop,
  ): Promise<Blob> => {
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = crop.width;
    canvas.height = crop.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2d context");

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height,
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, "image/jpeg");
    });
  };

  // Auto-poll payment status
  useEffect(() => {
    if (!paymentData) return;

    // Countdown Timer
    const target = new Date(paymentData.expired_at).getTime();
    const timerInterval = setInterval(() => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, "0")}`);
    }, 1000);

    const interval = setInterval(async () => {
      console.log("Auto-polling status for:", paymentData.order_id);
      try {
        const res = await fetch(
          `/api/memes/check-status?order_id=${paymentData.order_id}`,
        );
        const data = await res.json();
        console.log("Poll result:", data);

        if (data.payment_status === "PAID") {
          setIsPaid(true);
          setTimeout(() => window.location.reload(), 3000);
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(timerInterval);
    };
  }, [paymentData]);

  const handleSubmit = async () => {
    if (!completedCrop || !imgRef.current) return;
    setIsUploading(true);
    setError(null);

    try {
      let fileToUpload: File;

      if (imageFile?.type === "image/gif") {
        // For GIFs, use the original file to preserve animation
        fileToUpload = imageFile;
      } else {
        // For static images, use the cropped blob
        const blob = await getCroppedImg(imgRef.current, completedCrop);
        fileToUpload = new File([blob], "meme.jpg", { type: "image/jpeg" });
      }

      // Clamp dimensions to fit within board boundaries
      const scaledW = Math.round(completedCrop.width * scale);
      const scaledH = Math.round(completedCrop.height * scale);
      const clampedW = Math.min(scaledW, GRID_SIZE - Math.round(position.x));
      const clampedH = Math.min(scaledH, GRID_SIZE - Math.round(position.y));

      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("x", Math.round(position.x).toString());
      formData.append("y", Math.round(position.y).toString());
      formData.append("width", clampedW.toString());
      formData.append("height", clampedH.toString());
      formData.append("title", title);

      const response = await fetch("/api/memes", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();

      if (result.payment) {
        setPaymentData(result.payment);
        // Don't close modal, show payment UI
        return;
      }

      onUpload(result.meme);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError("Upload failed. Try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // --- Overlap Calculation Logic ---
  const calculateOverlapArea = () => {
    if (!completedCrop) return 0;

    // Current meme stats (scaled)
    const cx = position.x;
    const cy = position.y;
    const cw = completedCrop.width * scale;
    const ch = completedCrop.height * scale;

    if (cw <= 0 || ch <= 0) return 0;

    let totalOverlap = 0;

    // Simple brute-force overlap check against all existing memes
    // Note: This approximates total overlap area.
    // If multiple regular memes overlap each other and we overlap them all,
    // we might double count pixels if we just sum them up.
    // But for a pricing mechanic, summing up "violation areas" is a fair implementation of "per override".

    existingMemes.forEach((meme) => {
      const mx = meme.x;
      const my = meme.y;
      const mw = meme.width;
      const mh = meme.height;

      // Calculate intersection rectangle
      const x_overlap = Math.max(
        0,
        Math.min(cx + cw, mx + mw) - Math.max(cx, mx),
      );
      const y_overlap = Math.max(
        0,
        Math.min(cy + ch, my + mh) - Math.max(cy, my),
      );

      const area = x_overlap * y_overlap;
      if (area > 0) {
        totalOverlap += area;
      }
    });

    return totalOverlap;
  };

  const rawWidth = completedCrop?.width || 0;
  const rawHeight = completedCrop?.height || 0;
  const width = Math.round(rawWidth * scale);
  const height = Math.round(rawHeight * scale);

  const baseArea = width * height;
  const overlapArea = calculateOverlapArea();

  const calculateRawCost = () => {
    const b = baseArea * PRICE_PER_PIXEL;
    const o = overlapArea * OVERRIDE_PRICE_PER_PIXEL;
    return b + o;
  };

  const rawTotalCost = calculateRawCost();
  // Only apply min if imageSrc exists
  const totalCost = !imgSrc ? 0 : Math.max(500, Math.ceil(rawTotalCost));

  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* Compact Container */}
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
          <h3 className="text-white font-bold font-mono text-sm uppercase tracking-wider flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-yellow-500" />
            Meme Baru
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Bar */}
        <div className="bg-yellow-500/10 border-b border-zinc-800 px-4 py-2 flex justify-between items-center text-xs font-mono">
          <span className="text-yellow-500">
            Posisi: {Math.round(position.x)}, {Math.round(position.y)}
          </span>
          <span className="text-zinc-400">
            {Math.round(width)} x {Math.round(height)} px
          </span>
        </div>

        {/* Payment View Override */}
        {isPaid ? (
          <div className="flex-1 bg-green-500 p-6 flex flex-col items-center justify-center text-center gap-4 animate-in zoom-in duration-300">
            <div className="bg-white p-4 rounded-full shadow-xl animate-bounce">
              <span className="text-4xl">🎉</span>
            </div>
            <h1 className="text-white text-3xl font-black italic uppercase tracking-tighter">
              PAYMENT SUCCESS!
            </h1>
            <p className="text-green-100 font-mono text-xs animate-pulse">
              Memuat ulang halaman...
            </p>
          </div>
        ) : paymentData ? (
          <div className="flex-1 bg-zinc-950 p-6 flex flex-col items-center justify-center text-center gap-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-white p-3 rounded-lg shadow-2xl">
              <QRCodeSVG
                value={paymentData.payment_number}
                size={200}
                level="M"
                includeMargin={true}
              />
            </div>

            <div className="space-y-1">
              <h4 className="text-white font-bold text-lg">Scan QRIS</h4>
              <p className="text-zinc-400 text-xs font-mono">
                Order ID: {paymentData.order_id}
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 w-full">
              <div className="flex justify-between items-center text-sm mb-1">
                <span className="text-zinc-500">Total Bayar</span>
                <span className="text-yellow-500 font-bold font-mono text-lg">
                  {formatCurrency(paymentData.amount)}
                </span>
              </div>
              <div className="text-[10px] text-zinc-600 font-mono flex justify-between">
                <span className="text-red-500 font-bold font-mono">
                  Exp: {timeLeft}
                </span>
                <span className="uppercase text-orange-500 font-bold animate-pulse">
                  Menunggu Pembayaran...
                </span>
              </div>
            </div>

            <button
              onClick={async () => {
                if (!paymentData || isCheckingStatus) return;
                setIsCheckingStatus(true);
                try {
                  const res = await fetch(
                    `/api/memes/check-status?order_id=${paymentData.order_id}`,
                  );
                  const data = await res.json();
                  if (data.payment_status === "PAID") {
                    setIsPaid(true);
                    setTimeout(() => window.location.reload(), 3000);
                  } else {
                    setError(
                      "Pembayaran belum masuk. Mohon tunggu notifikasi sukses...",
                    );
                    setTimeout(() => setError(null), 3000);
                  }
                } catch (e) {
                  setError("Gagal mengecek status.");
                } finally {
                  setIsCheckingStatus(false);
                }
              }}
              disabled={isCheckingStatus}
              className={`w-full py-3 rounded-lg font-bold transition mt-2 flex items-center justify-center gap-2 ${
                isCheckingStatus
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-zinc-800 hover:bg-zinc-700 text-white"
              }`}
            >
              {isCheckingStatus ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  Mengecek...
                </>
              ) : (
                "Cek Status Pembayaran"
              )}
            </button>
          </div>
        ) : (
          <>
            {/* Content Area */}
            <div className="flex-1 bg-black relative overflow-hidden flex items-center justify-center min-h-[300px]">
              {isScanning && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 animate-in fade-in duration-200">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500 mb-3"></div>
                  <p className="text-yellow-500 font-mono text-xs animate-pulse tracking-widest font-bold">
                    SCANNING NSFW...
                  </p>
                </div>
              )}

              {imgSrc ? (
                <div className="p-4 w-full h-full flex items-center justify-center">
                  {imageFile?.type === "image/gif" ? (
                    // GIF Mode: Show original image without crop
                    <div className="relative max-h-[50vh]">
                      <img
                        ref={imgRef}
                        alt="Preview"
                        src={imgSrc}
                        onLoad={(e) => {
                          const { naturalWidth, naturalHeight } =
                            e.currentTarget;
                          // Clamp size so it fits within board boundaries
                          const maxW = GRID_SIZE - position.x;
                          const maxH = GRID_SIZE - position.y;
                          const w = Math.min(naturalWidth, maxW);
                          const h = Math.min(naturalHeight, maxH);
                          setCompletedCrop({
                            unit: "px",
                            x: 0,
                            y: 0,
                            width: w,
                            height: h,
                          });
                        }}
                        style={{
                          maxHeight: "50vh",
                          maxWidth: "100%",
                          objectFit: "contain",
                        }}
                      />
                      <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-md uppercase font-bold tracking-wider">
                        GIF • Fixed Size
                      </div>
                    </div>
                  ) : (
                    // Standard Image Mode: Show Crop
                    <ReactCrop
                      crop={crop}
                      onChange={(_, percentCrop: Crop) => setCrop(percentCrop)}
                      onComplete={(c: PixelCrop) => setCompletedCrop(c)}
                      disabled={isUploading}
                      className={`max-h-[50vh] ${isUploading ? "pointer-events-none opacity-50" : ""}`}
                    >
                      <img
                        ref={imgRef}
                        alt="Crop me"
                        src={imgSrc}
                        onLoad={onImageLoad}
                        style={{
                          maxHeight: "50vh",
                          maxWidth: "100%",
                          objectFit: "contain",
                        }}
                      />
                    </ReactCrop>
                  )}

                  {/* Floating Remove Button */}
                  <button
                    onClick={() => {
                      setImgSrc("");
                      setImageFile(null);
                      setCompletedCrop(undefined);
                    }}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-1.5 rounded-full backdrop-blur-md transition z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-800/50 transition gap-3 text-zinc-500 hover:text-zinc-300">
                  <Upload className="w-10 h-10 mb-2" />
                  <span className="font-medium text-sm">
                    Ketuk untuk upload gambar ({ACCEPTED_IMAGE_LABEL})
                  </span>
                  <input
                    type="file"
                    accept={ACCEPTED_IMAGE_TYPES}
                    onChange={onSelectFile}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Scale Selector — only show when image is loaded */}
            {imgSrc && (
              <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase font-bold tracking-wider">
                    Skala
                  </span>
                  <div className="flex gap-1">
                    {SCALE_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setScale(opt)}
                        className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition ${
                          scale === opt
                            ? "bg-yellow-500 text-black"
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                        }`}
                      >
                        {opt}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Footer Controls */}
            <div className="p-4 bg-zinc-900 border-t border-zinc-800 space-y-4">
              {/* Pricing Breakdown */}
              <div className="text-[10px] text-zinc-500 flex justify-between items-center px-1 font-mono">
                <span>Harga: Rp {PRICE_PER_PIXEL}/px</span>
                {overlapArea > 0 && (
                  <span className="text-orange-500">
                    Timpa: +Rp {OVERRIDE_PRICE_PER_PIXEL}/px
                  </span>
                )}
              </div>

              {/* Action Bar */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex-1 ${overlapArea > 0 ? "bg-orange-950/30 border-orange-500/50" : "bg-zinc-950 border-zinc-800"} rounded-lg border px-3 py-2 flex flex-col justify-center`}
                >
                  <span className="text-xs text-zinc-500 uppercase font-bold flex items-center gap-1">
                    Total Biaya
                    {overlapArea > 0 && (
                      <AlertTriangle className="w-3 h-3 text-orange-500" />
                    )}
                  </span>
                  <span
                    className={`text-lg font-bold ${overlapArea > 0 ? "text-orange-500" : "text-green-500"} font-mono leading-none mt-1`}
                  >
                    {formatCurrency(totalCost)}
                  </span>
                  {totalCost === 500 && rawTotalCost < 500 && (
                    <span className="text-[10px] text-zinc-500 font-normal italic block text-right w-full">
                      *Min. Rp 500
                    </span>
                  )}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!completedCrop || isUploading || isScanning}
                  className={`flex-1 font-bold py-2 rounded-lg shadow-lg active:scale-95 transition flex items-center justify-center gap-2 ${
                    !completedCrop || isUploading || isScanning
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      : "bg-yellow-500 hover:bg-yellow-400 text-black"
                  }`}
                >
                  {isUploading ? (
                    "Loading..."
                  ) : isScanning ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      SCANNING...
                    </>
                  ) : (
                    "Minting"
                  )}
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-500">{error}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UploadModal;
