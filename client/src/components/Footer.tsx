import sponsor1 from "../assets/sponsor1.svg";
import sponsor2 from "../assets/sponsor2.svg";
import sponsor3 from "../assets/sponsor3.svg";

export default function Footer() {
  return (
    <footer className="bg-[var(--color-dark)] text-[var(--color-white)] py-6 mt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-4">
          <h3 className="font-bold mb-2">Patrocinadores</h3>
          <div className="h-1 w-20 bg-[var(--color-primary)] mx-auto"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 justify-center items-center mt-6">
          <div className="flex justify-center">
            <img src={sponsor1} alt="Patrocinador 1" className="h-16 md:h-20" />
          </div>
          <div className="flex justify-center">
            <img src={sponsor2} alt="Patrocinador 2" className="h-16 md:h-20" />
          </div>
          <div className="flex justify-center">
            <img src={sponsor3} alt="Patrocinador 3" className="h-16 md:h-20" />
          </div>
        </div>
        
        <div className="text-center text-sm mt-8 text-gray-400 border-t border-gray-800 pt-4">
          <p>&copy; {new Date().getFullYear()} Emparejador de Canchas. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}