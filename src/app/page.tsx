import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col space-y-3">
      <Link href="/quiz">
        quiz
      </Link>
      <Link href="/flashcard">
        flashcard
      </Link>
    </div>
  )
}