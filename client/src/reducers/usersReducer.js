//REDUCER TO FETCH ALL USERNAMES.
import { FETCH_USERS } from '../actions/types';

export const usersReducer = (state = [], action) => {
	switch (action.type) {
		case FETCH_USERS:
			return action.payload;
		default:
			return state;
	}
};
