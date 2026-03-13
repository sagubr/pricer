export class NotificationLimitExceeded extends Error {
	constructor(message = "Notification limit exceeded") {
		super(message);
		Object.setPrototypeOf(this, new.target.prototype);
		this.name = "NotificationLimitExceeded";
	}
}

export class NotificationNotFound extends Error {
	constructor(message = "Notification not found") {
		super(message);
		Object.setPrototypeOf(this, new.target.prototype);
		this.name = "NotificationNotFound";
	}
}
