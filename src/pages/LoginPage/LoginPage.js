import React from 'react';
import AuthTemplate from '../../components/templates/AuthTemplate/AuthTemplate';
import LoginForm from '../../components/organisms/LoginForm/LoginForm';

const LoginPage = () => (
  <AuthTemplate minimal={true}>
    <LoginForm />
  </AuthTemplate>
);

export default LoginPage;

