import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "The Magic Coffin"

interface ContactNotificationProps {
  name?: string
  email?: string
  company?: string
  message?: string
}

const ContactNotificationEmail = ({ name, email, company, message }: ContactNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New contact form submission from {name || 'someone'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New Contact Form Submission</Heading>
        <Text style={label}>Name</Text>
        <Text style={value}>{name || 'Not provided'}</Text>
        <Text style={label}>Email</Text>
        <Text style={value}>{email || 'Not provided'}</Text>
        {company && (
          <>
            <Text style={label}>Company</Text>
            <Text style={value}>{company}</Text>
          </>
        )}
        <Hr style={hr} />
        <Text style={label}>Message</Text>
        <Text style={value}>{message || 'No message provided'}</Text>
        <Hr style={hr} />
        <Text style={footer}>This email was sent from the {SITE_NAME} contact form.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactNotificationEmail,
  subject: (data: Record<string, any>) => `New contact: ${data.name || 'Unknown'}`,
  to: 'hello@themagiccoffin.com',
  displayName: 'Contact form notification',
  previewData: { name: 'Jane Doe', email: 'jane@example.com', company: 'Acme Corp', message: 'I would love to learn more about your services.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Bricolage Grotesque', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2A0E33', margin: '0 0 24px' }
const label = { fontSize: '11px', fontWeight: '600' as const, color: '#7B3A91', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '16px 0 2px' }
const value = { fontSize: '15px', color: '#1B1F24', lineHeight: '1.5', margin: '0 0 8px' }
const hr = { borderColor: '#E5C54F', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
