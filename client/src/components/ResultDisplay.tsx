import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Download } from "lucide-react";
import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import type { CourtPairing } from "@shared/schema";

interface ResultDisplayProps {
  pairings: CourtPairing[];
}

export default function ResultDisplay({ pairings }: ResultDisplayProps) {
  const resultsRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Function to generate and share image via WhatsApp
  const shareViaWhatsApp = async () => {
    if (!resultsRef.current || pairings.length === 0) return;
    
    try {
      setIsSharing(true);
      
      // Generate canvas from the results div
      const canvas = await html2canvas(resultsRef.current, {
        backgroundColor: "#ffffff",
        scale: 2, // Better quality
      });
      
      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsSharing(false);
          return;
        }
        
        try {
          // Save the image temporarily
          const fileName = `pairings-${new Date().toISOString().slice(0, 10)}.png`;
          saveAs(blob, fileName);
          
          // Create WhatsApp share URL
          const whatsappURL = `https://wa.me/?text=Resultados de emparejamientos`;
          
          // Open WhatsApp web
          window.open(whatsappURL, '_blank');
        } catch (error) {
          console.error("Error sharing image:", error);
        } finally {
          setIsSharing(false);
        }
      }, 'image/png', 0.8);
      
    } catch (error) {
      console.error("Error generating image:", error);
      setIsSharing(false);
    }
  };

  // Function to download the results as image
  const downloadAsImage = async () => {
    if (!resultsRef.current || pairings.length === 0) return;
    
    try {
      setIsSharing(true);
      
      // Generate canvas from the results div
      const canvas = await html2canvas(resultsRef.current, {
        backgroundColor: "#ffffff",
        scale: 2, // Better quality
      });
      
      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const fileName = `pairings-${new Date().toISOString().slice(0, 10)}.png`;
          saveAs(blob, fileName);
        }
        setIsSharing(false);
      }, 'image/png', 0.8);
      
    } catch (error) {
      console.error("Error downloading image:", error);
      setIsSharing(false);
    }
  };

  return (
    <Card className="bg-white shadow rounded-lg mb-6">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Resultados</h2>
          
          {pairings.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadAsImage}
                disabled={isSharing}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                <span>Descargar</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={shareViaWhatsApp}
                disabled={isSharing}
                className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white border-transparent"
              >
                <Share2 className="h-4 w-4" />
                <span>WhatsApp</span>
              </Button>
            </div>
          )}
        </div>
        
        <div ref={resultsRef} className="space-y-4 bg-white p-4 rounded-lg">
          {pairings.length === 0 ? (
            <div className="flex items-center justify-center p-8 text-gray-500">
              Haz clic en "Generar Parejas" para crear emparejamientos aleatorios
            </div>
          ) : (
            <>
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-primary-700">Resultados de Emparejamientos</h3>
                <p className="text-sm text-gray-500">{new Date().toLocaleDateString()}</p>
              </div>
              
              {pairings.map((pairing) => (
                <div key={pairing.courtId} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-2 bg-primary-100 p-2 rounded text-center">
                    {pairing.courtName}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded shadow-sm border border-gray-100">
                      <div className="text-sm font-medium text-primary-600 mb-2 text-center">Pareja 1</div>
                      <ul className="space-y-1">
                        <li className="text-gray-700 text-center">{pairing.pair1.player1.name}</li>
                        <li className="text-gray-700 text-center">{pairing.pair1.player2.name}</li>
                      </ul>
                    </div>
                    <div className="bg-white p-3 rounded shadow-sm border border-gray-100">
                      <div className="text-sm font-medium text-primary-600 mb-2 text-center">Pareja 2</div>
                      <ul className="space-y-1">
                        <li className="text-gray-700 text-center">{pairing.pair2.player1.name}</li>
                        <li className="text-gray-700 text-center">{pairing.pair2.player2.name}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
        
        {isSharing && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Procesando imagen... 
            <span className="inline-block animate-spin ml-2">⟳</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
