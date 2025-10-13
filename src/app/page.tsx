export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">MathParenting</h1>
      <p className="text-gray-600">
        Parent-friendly math explanations with everyday household examples.
      </p>
      <div className="mt-6">
        <a
          href="/chat"
          className="inline-block rounded-lg bg-blue-600 px-5 py-2 text-white font-semibold hover:bg-blue-700"
        >
          Open Chat
        </a>
      </div>
    </div>
  );
}
