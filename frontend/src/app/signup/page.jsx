"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/components/authProvider"
import { extractErrorMessage, extractFieldErrors } from "@/lib/formErrors"

const SIGNUP_URL = "/api/signup/"


export default function Page() {
  const auth = useAuth()
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")
    setFieldErrors({})
    const formData = new FormData(event.target)
    const objectFromForm = Object.fromEntries(formData)
    
    if (objectFromForm.password !== objectFromForm.confirm_password) {
      setError("Passwords do not match")
      return
    }
    
    const jsonData = JSON.stringify(objectFromForm)
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: jsonData
    }
    
    const response = await fetch(SIGNUP_URL, requestOptions)
    
    let data = {}
    try {
      data = await response.json()
    } catch (error) {
      setError("An unexpected error occurred")
      return
    }

    if (response.ok) {
      auth.login(data?.username)
    } else if (Array.isArray(data.detail)) {
      setFieldErrors(extractFieldErrors(data))
    } else {
      setError(extractErrorMessage(data) || "Signup failed. Please try again.")
    }
  }
  return (
    <div className="w-full lg:grid lg:min-h-[85vh]  lg:grid-cols-2 xl:min-h-[90vh]">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Sign Up</h1>
            <p className="text-balance text-muted-foreground">
              Create an account to get started
            </p>
          </div>
          <div className="grid gap-4">
            <form onSubmit={handleSubmit} className="grid gap-4">
              {error && (
                <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="username"
                  name="username"
                  placeholder="Choose a username"
                  required
                />
                {fieldErrors.username && (
                  <p className="text-sm text-destructive">{fieldErrors.username}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  required
                />
                {fieldErrors.email && (
                  <p className="text-sm text-destructive">{fieldErrors.email}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  placeholder="Choose a password"
                  required 
                />
                {fieldErrors.password && (
                  <p className="text-sm text-destructive">{fieldErrors.password}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input 
                  id="confirm_password" 
                  name="confirm_password" 
                  type="password" 
                  placeholder="Confirm your password"
                  required 
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Sign Up
              </Button>
            </form>
          </div>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        <Image
          src="/signup.png"
          alt="Image"
          width="1920"
          height="1080"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}