/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

/**
 * Email-change verification email — CODE-FIRST.
 *
 * Why a code instead of a link?
 *   • Magic links can be mangled by Outlook safe-links / corporate proxies.
 *   • Links bounce through the Supabase Auth domain; misconfigured redirects
 *     fail silently and lock users out.
 *   • A 6-digit code proves the user controls THIS inbox in THIS session,
 *     no link clicking required.
 *
 * Supabase's email-change flow sends this email to BOTH the old and the
 * new address. Either code works to finalize the change.
 *
 * The `token` is provided by Supabase Auth as `payload.data.token` and is
 * the same OTP that `auth.verifyOtp({ type: "email_change" })` accepts.
 */

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  token: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  token,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} email-change code: {token}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirm your email change</Heading>
        <Text style={text}>
          Someone (hopefully you) requested to change the {siteName} login
          email from{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          to{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={text}>
          Enter this 6-digit code in the admin panel to confirm the change:
        </Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={smallText}>
          This code expires in about 1 hour. If you didn't request this
          change, you can safely ignore this email — your account stays on{' '}
          {email}.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '520px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(280, 55%, 24%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(260, 10%, 30%)',
  lineHeight: '1.6',
  margin: '0 0 18px',
}
const link = { color: 'hsl(280, 55%, 24%)', textDecoration: 'underline' }
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '34px',
  fontWeight: 'bold' as const,
  letterSpacing: '0.4em',
  color: 'hsl(280, 55%, 24%)',
  backgroundColor: 'hsl(50, 82%, 95%)',
  padding: '18px 24px',
  borderRadius: '12px',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}
const smallText = {
  fontSize: '12px',
  color: 'hsl(260, 10%, 50%)',
  lineHeight: '1.5',
  margin: '24px 0 0',
}
