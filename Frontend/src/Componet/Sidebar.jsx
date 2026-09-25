import React from "react";
import { NavLink } from "react-router-dom";

export default function Sidebar() {

	const linkClass = ({ isActive }) =>
		`block px-4 py-2 rounded-lg text-sm transition-all duration-200
		${isActive
			? 'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-600'
			: 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
		}`;

	return (
		<aside className="w-64 bg-white border-r border-blue-100 shadow-sm hidden lg:block">
			<div className="p-5">

				{/* TITLE */}
				<div className="text-xs text-blue-400 uppercase mb-3 tracking-wide">
					Navigation
				</div>

				{/* NAV LINKS */}
				<nav className="space-y-2">
					<NavLink to="/patient" className={linkClass} end>
						🏠 Dashboard
					</NavLink>

					<NavLink to="/patient/profile" className={linkClass}>
						👤 Profile
					</NavLink>

					<NavLink to="/patient/appointments" className={linkClass}>
						📅 Appointments
					</NavLink>

					<NavLink to="/patient/browse-services" className={linkClass}>
						🩺 Browse Services
					</NavLink>
				</nav>

			</div>
		</aside>
	);
}