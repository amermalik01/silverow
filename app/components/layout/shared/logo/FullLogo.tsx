"use client";

import Image from "next/image";

const FullLogo = () => {
  return (
    <>
      {/* Dark Logo */}
      <Image
        // src="/images/logos/dark-logo.svg"
        src="/images/logos/nevico-logo-new.png"
        // src="/images/logos/nevico-logo.png"
        alt="logo"
        width={140}
        height={16}
        className="block dark:hidden rtl:scale-x-[-1]"
      />
      {/* Light Logo */}
      <Image
        // src="/images/logos/light-logo.svg"
        src="/images/logos/nevico-logo-new.png"
        // src="/images/logos/nevico-logo.png"
        alt="logo"
        width={204}
        height={16}
        // height={36}
        className="hidden dark:block rtl:scale-x-[-1]"
      />
    </>
  );
};

export default FullLogo;
