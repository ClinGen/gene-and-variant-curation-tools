import '@aws-amplify/ui/dist/style.css'; // import stylings for Login & SignUp UI; once imported here, will work for Login & SignUp UI anywhere


export const signUpConfig = {
  header: 'Create Account',
  hideAllDefaults: true,
  defaultCountryCode: '1',
  signUpFields: [
      {
          label: 'Email',
          key: 'username',
          required: true,
          displayOrder: 1,
          type: 'email'
      },
      {
          label: 'First Name',
          key: 'name',
          required: true,
          displayOrder: 3,
          type: 'string'
      },
      {
          label: 'Last Name',
          key: 'family_name',
          required: true,
          displayOrder: 4,
          type: 'string'
      },
      {
          label: 'Password',
          key: 'password',
          required: true,
          displayOrder: 2,
          type: 'password'
      },
      {
          label: 'Institution',
          key: 'custom:institution',
          required: false,
          displayOrder: 5,
          type: 'string'
      }
  ]
}
