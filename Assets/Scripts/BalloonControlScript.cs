using UnityEngine;
using System.Collections;

public class BalloonControlScript : MonoBehaviour {

	public float explosionRadius = 3f;
	public float speed = 8f;
	private Vector3 direction;

	// Use this for initialization
	void Start () {
		direction = transform.up;
	}
	
	// Update is called once per frame
	void Update () {
		float x = Random.Range (-1f, 1f);
		float y = Random.Range (-1f, 1f);
		direction = new Vector3 (direction.x + x, direction.y + y, 0f);

		transform.position += direction * speed * Time.deltaTime;
	}

	void OnTriggerEnter2D(Collider2D coll){
		if (coll.gameObject.name == "plane") {
			Debug.Log ("plane balloon collision");

			//blow up the birds!
			Collider2D[] enemies = Physics2D.OverlapCircleAll(transform.position, explosionRadius);
			for (int i = 0; i < enemies.Length; i++) {
				if (enemies [i].gameObject.name == "bird(Clone)") {
					//Destroy (enemies [i].gameObject);
					enemies [i].gameObject.GetComponent<BirdControlScript> ().hit (transform.position);
				}
			}

			Instantiate(coll.gameObject.GetComponent<PlaneControlScript>().balloonPopParticle , new Vector3(transform.position.x, transform.position.y, -2f), Quaternion.identity);

			//destroy the balloon
			Destroy (this.gameObject);
		}
	}
}
