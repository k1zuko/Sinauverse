'use client'

import { Suspense } from "react"
import JoinGame from "./pageForJoin"

export default function JoinGamePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JoinGame />
    </Suspense>
  )
}