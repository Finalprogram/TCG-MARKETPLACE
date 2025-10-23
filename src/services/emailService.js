const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendVerificationEmail = async (to, token) => {
  const verificationLink = `${process.env.BASE_URL}/auth/verify-email?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Verifique seu Email - TCG Marketplace',
    html: `
      <p>Olá,</p>
      <p>Obrigado por se registrar no TCG Marketplace. Por favor, verifique seu email clicando no link abaixo:</p>
      <p><a href="${verificationLink}">Verificar Email</a></p>
      <p>Este link expirará em 1 hora.</p>
      <p>Se você não se registrou em nosso site, por favor, ignore este email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Email de verificação enviado para ${to}`);
  } catch (error) {
    logger.error(`Erro ao enviar email de verificação para ${to}:`, error);
  }
};

module.exports = { sendVerificationEmail };