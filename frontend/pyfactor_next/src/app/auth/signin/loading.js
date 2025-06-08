'use client';


export default function SignInLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="bg-white rounded-lg shadow-md p-8 flex flex-col items-center justify-center max-w-md w-full h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    </div>
  );
}