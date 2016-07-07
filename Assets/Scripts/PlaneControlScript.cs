using UnityEngine;
using System.Collections;

public class PlaneControlScript : MonoBehaviour {

	public float speed = 8.0f;
	public float rotationSpeed = 400.0f;


	// Use this for initialization
	void Start () {
	}
	
	// Update is called once per frame
	void Update () {

		if (Input.GetKey("left") || Input.GetKey("a")) {
			transform.Rotate (0, 0, rotationSpeed * Time.deltaTime);
		}

		if (Input.GetKey("right") || Input.GetKey("d")) {
			transform.Rotate (0, 0, -rotationSpeed * Time.deltaTime);
		}

		if (Input.GetMouseButton (0)) {
			Debug.Log (Input.mousePosition);
			if (Input.mousePosition.x < Screen.width / 2f) {
				transform.Rotate (0, 0, rotationSpeed * Time.deltaTime);
			} else {
				transform.Rotate (0, 0, -rotationSpeed * Time.deltaTime);
			}
		}

		transform.position += transform.up * Time.deltaTime * speed;
	
	}
}
