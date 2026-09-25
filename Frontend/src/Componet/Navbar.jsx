import React from "react";
import { useSiteName } from "../utils/siteName";

export default function Navbar() {
  const siteName = useSiteName();
  const siteInitial = siteName.trim().charAt(0).toUpperCase() || "H";

  return (
    <nav className="w-full py-3 px-4 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-white font-bold">
            {siteInitial}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800">{siteName}</div>
            <div className="text-xs text-gray-500">Care that makes you smile</div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <a className="text-sm text-gray-600 hover:text-gray-800">Services</a>
          <a className="text-sm text-gray-600 hover:text-gray-800">Doctors</a>
          <a className="text-sm text-gray-600 hover:text-gray-800">Help</a>
        </div>
      </div>
    </nav>
  );
}