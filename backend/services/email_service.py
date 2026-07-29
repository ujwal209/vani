import asyncio
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import settings

logger = logging.getLogger("vani.email")

async def send_email(to_email: str, subject: str, html_content: str):
    """
    Sends an email using standard smtplib with TLS on port 587.
    Executed in a threadpool executor to remain non-blocking in FastAPI.
    """
    def _send():
        try:
            if not settings.EMAIL_WORKER or not settings.APP_PASSWORD:
                logger.error("EMAIL_WORKER or APP_PASSWORD not configured in .env!")
                return False

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"Vani Assistant <{settings.EMAIL_WORKER}>"
            msg["To"] = to_email

            part = MIMEText(html_content, "html")
            msg.attach(part)

            server = smtplib.SMTP("smtp.gmail.com", 587)
            server.ehlo()
            server.starttls()
            server.login(settings.EMAIL_WORKER, settings.APP_PASSWORD)
            server.sendmail(settings.EMAIL_WORKER, to_email, msg.as_string())
            server.quit()
            logger.info(f"Email successfully sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _send)


async def send_verification_otp(to_email: str, name: str, otp_code: str):
    subject = "Vani - Verify your Email Address"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; borderRadius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #16a34a; margin: 0;">🌾 Vani वाणी</h1>
            <p style="color: #666666; font-size: 14px; margin-top: 4px;">Government Policy Assistant for Rural & All Citizens</p>
        </div>
        <hr style="border: none; border-top: 1px solid #eeeeee;" />
        <div style="padding: 20px 0;">
            <h2 style="color: #1f2937;">Hello {name},</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
                Thank you for joining <strong>Vani</strong>. Please use the following 6-digit verification code to complete your signup:
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #16a34a; background-color: #f0fdf4; padding: 12px 24px; border-radius: 8px; border: 1px dashed #22c55e;">
                    {otp_code}
                </span>
            </div>
            <p style="color: #6b7280; font-size: 14px;">This code will expire in 15 minutes. If you did not request this, please ignore this email.</p>
        </div>
        <hr style="border: none; border-top: 1px solid #eeeeee;" />
        <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
            &copy; 2026 Vani Project - Empowering Rural India with AI
        </div>
    </div>
    """
    return await send_email(to_email, subject, html)


async def send_password_reset_otp(to_email: str, name: str, otp_code: str):
    subject = "Vani - Password Reset Code"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; borderRadius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2563eb; margin: 0;">🌾 Vani वाणी</h1>
            <p style="color: #666666; font-size: 14px; margin-top: 4px;">Government Policy Assistant</p>
        </div>
        <hr style="border: none; border-top: 1px solid #eeeeee;" />
        <div style="padding: 20px 0;">
            <h2 style="color: #1f2937;">Reset Your Password</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
                We received a request to reset your password for your Vani account ({to_email}). Use the code below:
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb; background-color: #eff6ff; padding: 12px 24px; border-radius: 8px; border: 1px dashed #3b82f6;">
                    {otp_code}
                </span>
            </div>
            <p style="color: #6b7280; font-size: 14px;">This code will expire in 15 minutes.</p>
        </div>
        <hr style="border: none; border-top: 1px solid #eeeeee;" />
        <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
            &copy; 2026 Vani Project
        </div>
    </div>
    """
    return await send_email(to_email, subject, html)
