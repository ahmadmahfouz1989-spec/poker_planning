import { Manrope } from 'next/font/google'
import '../styles/globals.css'

const manrope = Manrope({ subsets: ['latin'], display: 'swap' })

export default function App({ Component, pageProps }) {
  return (
    <div className={manrope.className}>
      <Component {...pageProps} />
    </div>
  )
}
