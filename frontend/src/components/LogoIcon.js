import React from 'react';

const LogoIcon = ({ className = "h-10 w-10" }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 40c11.046 0 20-8.954 20-20S31.046 0 20 0 0 8.954 0 20s8.954 20 20 20z" fill="#60A5FA"/>
    <path d="M12 16h16M20 8v16" stroke="#fff" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

export default LogoIcon;