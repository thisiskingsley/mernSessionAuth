import React, { useEffect } from 'react';
import history from '../history';

const LoadingPage = () => {
	useEffect(() => {
		const timer = setTimeout(() => {
			history.push('/');
		}, 5000);
		return () => clearTimeout(timer);
	}, []);

	return (
		<div>
			<div>
				<h1>Loading!!!</h1>
				<p>(but, maybe you shouldn't be here)</p>
				<h2>If longer than 5 seconds, you will be redirected to Home Page</h2>
			</div>
		</div>
	);
};

export default LoadingPage;
