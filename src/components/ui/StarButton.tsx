import React, { ButtonHTMLAttributes, useState } from "react";
import StarIcon from "../icons/StarIcon";

type StarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export default function StarButton({ active: externalActive, ...props }: StarButtonProps) {
  const [internalActive, setInternalActive] = useState(false);
  
  const active = externalActive !== undefined ? externalActive : internalActive;

  return (
    <button
      type="button"
      onClick={() => {
        if (externalActive === undefined) {
          setInternalActive((prev) => !prev);
        }
      }}
      {...props}
      className="bg-transparent cursor-pointer"
    >
      <StarIcon fillColor={active ? "rgba(255,255,255,0.2)" : "white"} />
    </button>
  );
}