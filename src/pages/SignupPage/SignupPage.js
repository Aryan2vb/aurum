import React from 'react';
import AuthTemplate from '../../components/templates/AuthTemplate/AuthTemplate';
import SignupForm from '../../components/organisms/SignupForm/SignupForm';

const SignupPage = () => (
  <AuthTemplate minimal={true}>
    <SignupForm />
  </AuthTemplate>
);

export default SignupPage;

