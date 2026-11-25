import { Link } from 'react-router-dom';
import { CivicLensLogo } from './Logo';

export function Footer() {
  return (
    <footer className="border-t border-[#20364A] bg-[#07111F] text-[#9AABBB]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2.5 text-lg font-bold text-[#F4F8FC]">
              <CivicLensLogo className="h-7 w-7" />
              <span className="font-display">CivicLens</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#9AABBB]">
              See Your City. Understand Your Community. Because understanding your city is the first step towards
              improving it.
            </p>
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-[#9AABBB]/80">
              CivicLens distinguishes Citizen Submitted reports, AI Generated guidance, Independently Verified records,
              and Officially Published government notices. Pilot coverage starts in Bengaluru, Karnataka with
              architecture built for all of India.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#F4F8FC]">Explore</h3>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li>
                <Link to="/explore" className="hover:text-[#19C98A] transition-colors">
                  Explore India Map
                </Link>
              </li>
              <li>
                <Link to="/locality/bengaluru" className="hover:text-[#19C98A] transition-colors">
                  Bengaluru Pilot Hub
                </Link>
              </li>
              <li>
                <Link to="/issues" className="hover:text-[#19C98A] transition-colors">
                  Civic Issues Tracker
                </Link>
              </li>
              <li>
                <Link to="/report" className="hover:text-[#19C98A] transition-colors">
                  Report a Civic Issue
                </Link>
              </li>
              <li>
                <Link to="/projects" className="hover:text-[#19C98A] transition-colors">
                  Development Projects
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#F4F8FC]">Civic Intelligence</h3>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li>
                <Link to="/assistant" className="hover:text-[#19C98A] transition-colors">
                  CivicLens AI Assistant
                </Link>
              </li>
              <li>
                <Link to="/departments" className="hover:text-[#19C98A] transition-colors">
                  Government Directory
                </Link>
              </li>
              <li>
                <Link to="/knowledge" className="hover:text-[#19C98A] transition-colors">
                  Knowledge Hub
                </Link>
              </li>
              <li>
                <Link to="/community" className="hover:text-[#19C98A] transition-colors">
                  Civic Community
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#F4F8FC]">Platform & Trust</h3>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li>
                <Link to="/dashboard" className="hover:text-[#19C98A] transition-colors">
                  Citizen Dashboard
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-[#19C98A] transition-colors">
                  Administration Console
                </Link>
              </li>
              <li>
                <Link to="/knowledge" className="hover:text-[#19C98A] transition-colors">
                  Privacy & Data Governance
                </Link>
              </li>
              <li>
                <a
                  href="https://pgportal.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#19C98A] transition-colors"
                >
                  CPGRAMS Official Portal
                </a>
              </li>
              <li>
                <a
                  href="https://bbmp.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#19C98A] transition-colors"
                >
                  BBMP Bengaluru Portal
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-[#20364A] pt-6 text-xs text-[#9AABBB] sm:flex-row sm:items-center">
          <div>
            CivicLens — Independent Civic Intelligence Platform for Indian Citizens. Not an official government agency.
          </div>
          <div className="flex items-center gap-5">
            <Link to="/knowledge" className="hover:text-[#F4F8FC]">
              Privacy Policy
            </Link>
            <Link to="/knowledge" className="hover:text-[#F4F8FC]">
              Terms & Guidelines
            </Link>
            <Link to="/community" className="hover:text-[#F4F8FC]">
              Contact & Community
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
