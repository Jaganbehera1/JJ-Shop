import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="mt-10 border-t border-gray-200 py-6 text-center text-sm text-gray-600">
      <p className="mb-1">
        © {new Date().getFullYear()}{" "}
        <span className="font-semibold text-blue-600">Jagan Behera</span>. All
        rights reserved.
      </p>
        <p className="text-xs text-gray-500">
          Building the future, one line of code at a time 🚀
        </p>
    </footer>
  );
};

export default Footer;
