import Link from "next/link";
import NotificationPage from "./notification/page";

export default function Home() {
  return (
    <div className="flex flex-col space-y-3">
      <NotificationPage />
    </div>
  )
}