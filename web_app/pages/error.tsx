'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h2>Something went wrong 😢</h2>
      <button onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}