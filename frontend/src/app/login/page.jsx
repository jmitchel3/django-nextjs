"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/components/authProvider"
import { extractErrorMessage } from "@/lib/formErrors"

const LOGIN_URL = "/api/login/"


export default function Page() {
  const auth = useAuth()
  const [error, setError] = useState("")

  async function handleSubmit (event) {
        event.preventDefault()
        setError("") // Clear any previous errors
        const formData = new FormData(event.target)
        const objectFromForm = Object.fromEntries(formData)
        const jsonData = JSON.stringify(objectFromForm)
        const requestOptions = {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: jsonData
        }
        const response = await fetch(LOGIN_URL, requestOptions)
        let data = {}
        try {
          data = await response.json()
        } catch (error) {
          
        }
        // const data = await response.json()
        if (response.ok) {
            auth.login(data?.username)
        } else {
          setError(extractErrorMessage(data) || "Login failed. Please check your credentials.")
        }
    }
  return (
    <div className="w-full lg:grid lg:min-h-[85vh]  lg:grid-cols-2 xl:min-h-[90vh]">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Login</h1>
            <p className="text-balance text-muted-foreground">
              Enter your email below to login to your account
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
                        placeholder="Your username"
                        required
                    />
                    </div>
                    <div className="grid gap-2">
                        <div className="flex items-center">
                            <Label htmlFor="password">Password</Label>
                         
                        </div>
                        <Input placeholder="Your password" id="password" name="password" type="password" required />
              
                    </div>
               
          
                    <Button type="submit" className="w-full">
                    Login
                    </Button>
 
            </form>
          </div>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        <Image
          src="/login.png"
          alt="Image"
          width="1920"
          height="1080"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}