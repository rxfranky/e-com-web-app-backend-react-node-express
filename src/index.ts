import express from "express"
import cors from 'cors'
import { type Express } from "express"
import 'dotenv/config'
import authRoutes from "./routes/auth.js"
import adminRoutes from './routes/admin.js'
import consumerRoutes from './routes/consumer.js'
import helmet from 'helmet'
import oAuthRoutes from './routes/oAuth.js'


const app: Express = express()

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "https://e-com-practice-backend.onrender.com"],
      },
    },
  })
);

app.use(cors({
  origin: 'https://e-com-web-app-frontend-node-react-e.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
}))

app.use(oAuthRoutes)

app.use(express.json())

app.use('/auth', authRoutes)
app.use('/admin', adminRoutes)
app.use('/consumer', consumerRoutes)

app.get('/hello', (req, res) => {
  return res.send('hello from backend')
})

const port = process.env.PORT || 3000
app.listen(port, (err: Error | undefined): void => {
  if (err) {
    return console.log('err in creating server-', err)
  }
  console.log('app is listening on port ' + port)
})
