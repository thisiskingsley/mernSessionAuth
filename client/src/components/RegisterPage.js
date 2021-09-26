import React from 'react';
import { Field, reduxForm } from 'redux-form';
import { connect } from 'react-redux';
import { createUser, fetchUsers } from '../actions/index';

class Register extends React.Component {
	componentDidMount() {
		this.props.fetchUsers();
	}
	renderError({ error, touched }) {
		if (touched && error) {
			return error;
		}
	}

	renderInput = ({ input, label, type, meta, placeholder }) => {
		return (
			<div className="six wide field">
				<label>{label}</label>
				<input {...input} placeholder={placeholder} type={type} autoComplete="off" />
				<div style={{ color: 'red', marginBottom: '10px' }}>{this.renderError(meta)}</div>
			</div>
		);
	};

	onSubmit = formValues => {
		this.props.createUser(formValues);
	};

	render() {
		return (
			<>
				<h1>Sign Up!</h1>
				<form className="ui form" onSubmit={this.props.handleSubmit(this.onSubmit)}>
					<Field
						name="username"
						label="Username: "
						component={this.renderInput}
						type="text"
						placeholder="Username"
						autoComplete="off"
					/>

					<Field
						name="password"
						label="Password: "
						component={this.renderInput}
						type="password"
						placeholder="Password"
					/>

					<div style={{ marginTop: '20px' }}>
						<button className="ui green button" type="submit">
							Submit
						</button>
					</div>
				</form>
			</>
		);
	}
}

const validate = (formValues, props) => {
	const errors = {};

	if (!formValues.username) {
		//only runs if the user did not enter a username
		errors.username = 'You must enter a username!';
	} else if (formValues.username.includes(' ')) {
		errors.username = 'No Spaces Please!';
	} else if (props.users.includes(formValues.username)) {
		errors.username = 'Sorry, username already taken!';
	}

	if (!formValues.password) {
		//ditto, but for password
		errors.password = 'You must enter a password!';
	}

	return errors;
};
const mapStateToProps = state => {
	return { users: state.users };
};

const formWrapped = reduxForm({
	form: 'registerForm',
	validate,
})(Register);

export default connect(mapStateToProps, { createUser, fetchUsers })(formWrapped);
