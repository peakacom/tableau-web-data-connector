import React from "react";
import { TailSpin } from "react-loader-spinner";

export interface SpinnerProps {
  message: string;
  isFullScreen: boolean;
}

const Spinner = ({ message, isFullScreen }: SpinnerProps) => {
  const className =
    "flex flex-col justify-center items-center w-full " +
    (isFullScreen ? "h-screen" : "h-full mt-6");
  return (
    <div className={className}>
      <TailSpin
        visible={true}
        height="80"
        width="80"
        color="#5F62F0"
        ariaLabel="tail-spin-loading"
        radius="1"
      />
      <p className="text-center text-gray-950 mt-20">{message}</p>
    </div>
  );
};

export default Spinner;
