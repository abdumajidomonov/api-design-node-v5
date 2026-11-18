import type { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { generateToken } from '../utils/jwt.ts'
import { comparePasswords } from '../utils/password.ts'
import { db } from '../db/connection.ts'
import { users } from '../db/schema.ts'

export const register = async (req: Request, res: Response) => {
  try {
    const { email, username, password, firstName, lastName } = req.body

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12')
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: users.createdAt,
      })

    const token = await generateToken({
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
    })

    res.status(201).json({
      message: 'User created successfully',
      user: newUser,
      token,
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Failed to create user' })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    // 1. Bazadan ushbu email bo'yicha userni topamiz
    const [user] = await db.select().from(users).where(eq(users.email, email))

    // 2. User topilmasa — 401 Unauthorized
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // 3. Parolni tekshiramiz
    const isPasswordValid = await comparePasswords(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // 4. To'g'ri bo'lsa — yangi JWT token yasaymiz
    const token = await generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
    })

    // 5. Muvaffaqiyatli javob (parolsiz!)
    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Failed to login' })
  }
}
