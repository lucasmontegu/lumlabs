import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface InvitationEmailProps {
  inviterName: string;
  organizationName: string;
  inviteLink: string;
  role: string;
  expiresAt: string;
}

export function InvitationEmail({
  inviterName = "Someone",
  organizationName = "a team",
  inviteLink = "https://vibecode.app/invite/abc123",
  role = "member",
  expiresAt = "7 days",
}: InvitationEmailProps) {
  const previewText = `${inviterName} invited you to join ${organizationName} on VibeCode`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo */}
          <Section style={logoSection}>
            <div style={logoWrapper}>
              <div style={logoIcon}>V</div>
              <Text style={logoText}>VibeCode</Text>
            </div>
          </Section>

          {/* Main Content */}
          <Section style={contentSection}>
            <Heading style={heading}>
              You've been invited to join {organizationName}
            </Heading>

            <Text style={paragraph}>
              <strong>{inviterName}</strong> has invited you to join{" "}
              <strong>{organizationName}</strong> on VibeCode as a{" "}
              <strong>{role}</strong>.
            </Text>

            <Text style={paragraph}>
              VibeCode is an AI-powered development platform that helps teams
              build features using natural language. No coding experience
              required.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={inviteLink}>
                Accept Invitation
              </Button>
            </Section>

            <Text style={paragraph}>
              Or copy and paste this URL into your browser:
            </Text>
            <Text style={link}>{inviteLink}</Text>

            <Hr style={hr} />

            <Text style={footer}>
              This invitation will expire in {expiresAt}. If you didn't expect
              this invitation, you can safely ignore this email.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              © {new Date().getFullYear()} VibeCode. All rights reserved.
            </Text>
            <Text style={footerText}>
              <Link href="https://vibecode.app" style={footerLink}>
                vibecode.app
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "0",
  marginBottom: "40px",
  borderRadius: "16px",
  overflow: "hidden" as const,
  maxWidth: "560px",
};

const logoSection = {
  backgroundColor: "#0a0a0a",
  padding: "32px 40px",
};

const logoWrapper = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const logoIcon = {
  width: "40px",
  height: "40px",
  backgroundColor: "#3b82f6",
  borderRadius: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#ffffff",
  fontSize: "20px",
  fontWeight: "700" as const,
  textAlign: "center" as const,
  lineHeight: "40px",
};

const logoText = {
  fontSize: "20px",
  fontWeight: "600" as const,
  color: "#ffffff",
  margin: "0",
};

const contentSection = {
  padding: "40px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "600" as const,
  color: "#0a0a0a",
  marginBottom: "24px",
  lineHeight: "1.3",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#4b5563",
  marginBottom: "16px",
};

const buttonContainer = {
  textAlign: "center" as const,
  marginTop: "32px",
  marginBottom: "32px",
};

const button = {
  backgroundColor: "#3b82f6",
  borderRadius: "9999px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
};

const link = {
  fontSize: "14px",
  color: "#3b82f6",
  wordBreak: "break-all" as const,
  marginBottom: "24px",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const footer = {
  fontSize: "14px",
  color: "#9ca3af",
  lineHeight: "1.5",
};

const footerSection = {
  backgroundColor: "#f9fafb",
  padding: "24px 40px",
  textAlign: "center" as const,
};

const footerText = {
  fontSize: "13px",
  color: "#9ca3af",
  margin: "4px 0",
};

const footerLink = {
  color: "#6b7280",
  textDecoration: "underline",
};

export default InvitationEmail;
